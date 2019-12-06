#!/bin/bash
aws logs describe-log-groups --query 'logGroups[*].{name:logGroupName}' | jq -r '.[] | .name' | grep 'busyweb-autotime' | while read -r loggroupname ; do
    aws logs delete-log-group --log-group-name $loggroupname
done
aws cloudformation delete-stack --stack-name busyweb-autotime
aws s3 rm s3://busyweb-autotime --recursive