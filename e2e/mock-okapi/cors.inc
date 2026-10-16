# Common CORS headers used in this mock Okapi
add_header Access-Control-Allow-Origin $cors_allow_origin always;
add_header Access-Control-Allow-Credentials "true" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers $http_access_control_request_headers always;
add_header Access-Control-Expose-Headers "X-Okapi-Token,Location,Content-Type" always;
add_header Access-Control-Max-Age 86400;
