const AWS = require("aws-sdk");
const SSM = new AWS.SSM({ apiVersion: '2014-11-06' });

exports.lambdaHandler = function(event, context) {
    const returnData = { logGroupName: context.logGroupName, logStreamName: context.logStreamName }
    try {
        // For Delete requests, immediately send a SUCCESS response.
        if (event.RequestType == "Delete") {
            sendResponse(event, context, "SUCCESS");
            return;
        }

        const parameterName = event.ResourceProperties.ParameterName;
        const username = event.ResourceProperties.UserName;
        const password = event.ResourceProperties.Password;
        const parameterValue = JSON.stringify({ username, password });

        SSM.putParameter({
            Name: parameterName,
            Type: "SecureString",
            Value: parameterValue,
            Overwrite: true
        }, (err, data) => {
            if (err) {
                console.log(err);
                sendResponse(event, context, "FAILED", { Error: "put parameter call failed" }, returnData);

            } else {
                sendResponse(event, context, "SUCCESS", { Message: `Successfully Created ${parameterName}` }, returnData);
            }
        })
    } catch (err) {
        console.log(err);
        sendResponse(event, context, "FAILED", { Error: "handler call failed" }, returnData);
    }
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