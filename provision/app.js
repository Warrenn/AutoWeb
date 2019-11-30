const AWS = require('aws-sdk')
var ssm = new AWS.SSM({ apiVersion: '2014-11-06' })

function putSecret(parameterName, parameterValue) {
    return new Promise((resolve, reject) => {
        ssm.putParameter({
            Name: parameterName,
            Type: "SecureString",
            Value: parameterValue
        }, (err, data) => {
            if (err) {
                reject(err)
                return
            }
            try {
                resolve(data)
            } catch (e) {
                reject(e)
            }
        })
    })
};

exports.lambdaHandler = async(event, context) => {
    try {
        const parameterValue = {
            username: event.ResourceProperties.UserName,
            password: event.ResourceProperties.Password
        }
        const parameterString = JSON.stringify(parameterValue)
        await putSecret(event.ResourceProperties.ParameterName, parameterString)
        sendResponse(event, context, "SUCCESS")
    } catch (err) {
        sendResponse(event, context, "SUCCESS", err)
    }
}

// Send response to the pre-signed S3 URL 
function sendResponse(event, context, responseStatus, responseData) {

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log("RESPONSE BODY:\n", responseBody);

    var https = require("https");
    var url = require("url");

    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };

    console.log("SENDING RESPONSE...\n");

    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
        // Tell AWS Lambda that the function execution is done  
        context.done();
    });

    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        // Tell AWS Lambda that the function execution is done  
        context.done();
    });

    // write data to request body
    request.write(responseBody);
    request.end();
}