#!/bin/bash

logf="${OPENSHIFT_NODEJS_LOG_DIR}node.log"
node ${OPENSHIFT_REPO_DIR}authorize.js >> $logf 2>&1 &
