#!/bin/sh
curl -H "Content-Type: application/json" -XPUT localhost:9200/sensor --data-binary @sensor_mapping.json

