const AWS = require("aws-sdk");
const SSM = new AWS.SSM({ apiVersion: '2014-11-06' });
var responseStatus = "FAILED";
var responseData = {};

exports.lambdaHandler = function(event, context) {
    try {
        // For Delete requests, immediately send a SUCCESS response.
        if (event.RequestType == "Delete") {
            return sendResponse(event, context, "SUCCESS");
        }

        SSM.putParameter({
            Name: parameterName,
            Type: "SecureString",
            Value: parameterValue
        }, (err, data) => {
            if (err) {
                responseData = { Error: "put parameter call failed" };
                console.log(data.Error + ":\n", err);
            } else {
                responseStatus = "SUCCESS";
                responseData = { Message: `Successfully Created ${parameterName}` }
            }
        })
    } catch (err) {
        responseData = { Error: "handler call failed" };
        console.log(responseData.Error + ":\n", err);
    }
    return sendResponse(event, context, responseStatus, responseData);
};

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

    let options_string = JSON.stringify(options);
    console.log("OPTIONS:\n", options_string);
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

    return responseBody;
}