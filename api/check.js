const { Deta } = require('deta')
const fetch = require('node-fetch')
const services = require('../services.json')

const deta = Deta(process.env.DETA_PROJECT_KEY)
const statuses = deta.Base('statuses')

const getServiceStatus = async (service) => {
	let up = true

	switch (service.monitor.type) {
		case 'http': {
			try {
				const res = await fetch(service.monitor.url)
				if (!res.ok) up = false
			} catch {
				up = false
			}

			break
		}

		case 'ping': {
			up = false
			break
		}
	}

	return up
}

const checkServices = async (services, object = {}) => {
	const promises = []
	for (const service of services) {
		if (service.children) {
			promises.push(checkServices(service.children, object))
		} else {
			promises.push(getServiceStatus(service)
				.then((up) => object[service.key] = up))
		}
	}
	await Promise.all(promises)
	return object
}

module.exports = async (req, res) => {
  const object = await checkServices(services)
  for (const key of Object.keys(object)) {
    if (await statuses.get(key)) {
      await statuses.update({
        up: object[key],
        checks: statuses.util.increment(),
        ...(object[key] ? { uptime: statuses.util.increment() } : {})
      }, key)
    } else {
      await statuses.put({
        up: object[key],
        checks: 1,
        uptime: object[key] ? 1 : 0
      }, key)
    }
  }

  res.status(200)
  res.json(object)
}