#!/bin/bash
echo 'Failed resources reason:'
echo "------------------------"
aws cloudformation describe-stack-events --stack-name busyweb-autotime --query 'StackEvents[*].{id:StackId,status:ResourceStatus,reason:ResourceStatusReason}' | jq '.[] | select(.status|test("FAILED")) | "\(.id): \(.reason)"'
echo "========================="
echo
aws logs describe-log-groups --query 'logGroups[*].{name:logGroupName}' | jq -r '.[] | .name' | grep 'busyweb-autotime' | tr -s \\n | while read -r loggroupname ; do
    aws logs describe-log-streams --log-group-name $loggroupname --query 'logStreams[*].{name:logStreamName}' | jq -r '.[] | .name' | while read -r logstreamname; do
        echo "showing events for $loggroupname $logstreamname:"
        aws logs get-log-events --log-group-name $loggroupname --log-stream-name $logstreamname --query 'events[*].{time:timestamp,message:message}' | jq '.[] | "\((.time / 1000) | todate)==>\(.message)"'
        echo
    done
done