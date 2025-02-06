const { HealthStatus, sequelizeInstance } = require("../models");

const { applyHeaders } = require("../utils/headers");
 
class HealthStatusController {

  static async fetchHealthStatus(req, res) {

    applyHeaders(res);
 

    if (Object.keys(req.query).length || Object.keys(req.body).length) {

      return res.status(400).end();

    }
 
    const defaultHeaders = [

      "host",
      "user-agent",
      "accept",
      "connection",
      "content-type",
      "content-length",
      "postman-token",
      "accept-encoding",
      "accept-language",

    ];
 
    const additionalHeaders = Object.keys(req.headers).filter(

      (header) => !defaultHeaders.includes(header.toLowerCase())

    );
 
    if (additionalHeaders.length > 0) {

      return res.status(400).end();

    }
 
    try {

      await sequelizeInstance.authenticate();

      await HealthStatus.create({

        timestamp: new Date(),

      });

      return res.status(200).end();

    } catch (err) {

      return res.status(503).end();

    }

  }
 
  static unsupportedMethods(req, res) {

    applyHeaders(res);

    res.status(405).end();

  }

}
 
module.exports = HealthStatusController;

 