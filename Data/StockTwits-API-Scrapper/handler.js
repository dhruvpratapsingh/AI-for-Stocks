'use strict';
const https = require ('https');
const AWS = require('aws-sdk');

const tickerName = process.env.TICKER;
const tableName = process.env.TABLE;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.hello = async event => {
  const messages = await getMessages();
  const save = await saveTwitToDb(Date.now().toString(), messages);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: messages,
        saveToDb: save.statusCode,
        body: save.body
      },
      null,
      2
    ),
  };
};

function getMessages() {
  return new Promise((resolve, reject) => {
    var params = {
             host: "api.stocktwits.com",
             path: "/api/2/streams/symbol/ric/" + tickerName + ".json"
             };

    const req = https.request(params, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        // console.log(JSON.parse(data));
        const messages = [];
        const response = JSON.parse(data);
        if (response && response.messages) {
          response.messages.forEach(element => {
            messages.push(element.body);
          });
        }
        resolve(messages);
      });
    });

    req.on('error', (e) => {
      reject(e.message);
    });

    // send the request
    req.end();
  });
}

function saveTwitToDb(id, messages) {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: tableName,
      Item: {
          id,
          messages
      },
    };
    dynamoDb.put(params, (error, data) => {
      if (error) {
        console.log(`createChatMessage ERROR=${error.stack}`);
          resolve({
            statusCode: 400,
            body: `Could not create message: ${error.stack}`
          });
  
      } else {
        resolve({ statusCode: 200, body: JSON.stringify(params.Item) });
      }
    });
  });
}
