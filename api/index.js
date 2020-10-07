const { Deta } = require('deta')
const ejs = require('ejs')
const services = require('../services.json')

const deta = Deta(process.env.DETA_PROJECT_KEY)
const statuses = deta.Base('statuses')

module.exports = async (req, res) => {
  const object = {}
  for await (const page of await statuses.fetch()) {
    for (const item of page) {
      object[item.key] = item
    }
  }

  res.setHeader('Content-Type', 'text/html')
  res.end(await ejs.renderFile(`${__dirname}/../templates/index.ejs`, { services, statuses: object }))
}