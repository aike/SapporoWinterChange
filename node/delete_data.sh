#!/bin/sh
curl -H'Content-Type: application/json' -XPOST 'localhost:9200/sensor/_delete_by_query?' -d'{"query":{"match_all":{}}}'

