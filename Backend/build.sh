#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Uncomment below to run migration on deploy
# node migrate.js
