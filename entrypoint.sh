#!/bin/bash

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"
case $key in
    -t|--token)
    TOKEN="$2"
    shift # past argument
    shift # past value
    ;;
    -o|--owner)
    OWNER="$2"
    shift # past argument
    shift # past value
    ;;
    -d|--date)
    DATE="$2"
    shift # past argument
    shift # past value
    ;;
    --report-repo)
    REPO="$2"
    shift # past argument
    shift # past value
    ;;
    --assignees)
    ASSIGNEES="$2"
    shift # past arugment
    shift # past value
    ;;
    --gather-emails)
    GATHEREMAILS=YES
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

echo "OWNER                = ${OWNER}"
echo "DATE                 = ${DATE}"
echo "GATHEREMAILS         = ${GATHEREMAILS}"
echo "REPO                 = ${REPO}"
echo "ASSIGNEES            = ${ASSIGNEES}"
echo "POSITIONAL           = ${POSITIONAL[0]}"

# Gather reports
eval node src/index.js --token $TOKEN $POSITIONAL --owner $OWNER --date $DATE ${GATHEREMAILS:+ --gather-emails}

# zip reports
ZIP_NAME=user_reports.$(date +%Y%m%d).zip
zip $ZIP_NAME unrecognized_users.json inactive_members.json errors.log active_members.json unrecognized_users.json

git clone "https://${TOKEN}@github.com/${OWNER}/${REPO}.git"

mv $ZIP_NAME $REPO/

cd $REPO
git config --global user.email "noreply@github.com"
git config --global user.name "UserReport Bot"

git add $ZIP_NAME 
git commit -m "Commiting latest user report"
git push

GITHUB_TOKEN=$TOKEN gh issue create -R "${OWNER}/${REPO}" --title "User Report $(date +%Y%m%d)" --body "User Activity Report located [${ZIP_NAME}](https://github.com/${OWNER}/${REPO}/blob/master/${ZIP_NAME})" --label "user report" --assignee ${ASSIGNEES}

