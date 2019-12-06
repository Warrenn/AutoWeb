#!/bin/bash

sam build --use-container
sam package --template-file template.yaml  --output-template-file template-out.yaml --s3-bucket busyweb-autotime
sam deploy --template-file template-out.yaml --stack-name busyweb-autotime --capabilities CAPABILITY_IAM