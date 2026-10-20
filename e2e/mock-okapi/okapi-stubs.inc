# Everything a mock-okapi server block does apart from naming its tenant:
# login handshake stubs, the /broker/ and /directory/ proxies, and the loud
# 404. The including server sets $tenant first.

set $permissions '["*"]';
# What Okapi would forward to the directory for a user holding every
# permission, as $permissions says: each directory role, consortium admin
# included.
set $directory_permissions '["directory.consortium.all","directory.institution.all","directory.system.all","directory.public.all"]';
set $user_id           00000000-0000-4000-8000-000000000001;
set $service_point_id  00000000-0000-4000-8000-000000000002;
set $username          devuser;

include /etc/nginx/cors.inc;

# SAML probe used during login bootstrap
location = /saml/check {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"active":false,"ssoEnabled":false}';
}

location ^~ /saml/ {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 404 '{"error":"mock okapi: saml not implemented"}';
}

# Pretend login always succeeds: return a token header + body
location = /authn/login {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    add_header X-Okapi-Token $token;
    add_header Set-Cookie "folioAccessToken=$token; Path=/; HttpOnly; SameSite=Lax";
    return 201 '{"okapiToken":"$token","userId":"$user_id","user":{"id":"$user_id","username":"$username","personal":{"firstName":"Dev","lastName":"User"}},"permissions":{"permissions":$permissions}}';
}

# What stripes-core actually posts to (RTR/cookie flow). With the access and
# refresh tokens expiring together it never attempts a token refresh.
location = /bl-users/login-with-expiry {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    add_header X-Okapi-Token $token;
    add_header Set-Cookie "folioAccessToken=$token; Path=/; HttpOnly; SameSite=Lax";
    return 201 '{"tokenExpiration":{"accessTokenExpiration":"$token_expiry","refreshTokenExpiration":"$token_expiry"},"user":{"id":"$user_id","username":"$username","active":true,"personal":{"firstName":"Dev","lastName":"User"}},"permissions":{"permissions":$permissions}}';
}

location = /bl-users/login {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    add_header X-Okapi-Token $token;
    add_header Set-Cookie "folioAccessToken=$token; Path=/; HttpOnly; SameSite=Lax";
    return 201 '{"userId":"$user_id","user":{"id":"$user_id","username":"$username","personal":{"firstName":"Dev","lastName":"User"}},"permissions":{"permissions":$permissions}}';
}

location = /authn/refresh {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    add_header X-Okapi-Token $token;
    add_header Set-Cookie "folioAccessToken=$token; Path=/; HttpOnly; SameSite=Lax";
    # stripes parses the body for the new expirations; an empty one logs it out
    default_type application/json;
    return 201 '{"accessTokenExpiration":"$token_expiry","refreshTokenExpiration":"$token_expiry"}';
}

location = /users {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"users":[{"id":"$user_id","username":"$username","active":true,"personal":{"lastName":"Dev","firstName":"User"}}],"totalRecords":1}';
}

location = /users/_self {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"user":{"id":"$user_id","username":"$username","active":true,"personal":{"lastName":"Dev","firstName":"User"}},"permissions":{"permissions":$permissions}}';
}

location = /bl-users/_self {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"user":{"id":"$user_id","username":"$username","active":true,"patronGroup":"patron-group","personal":{"lastName":"Dev","firstName":"User","email":"dev@example.org"}},"permissions":{"permissions":$permissions}}';
}

# Permissions lookup - allow everything
location ~ ^/perms/users/.*/permissions {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"permissionNames":$permissions,"totalRecords":1}';
}

location ^~ /service-points-users {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"servicePointsUsers":[{"userId":"$user_id","servicePointsIds":["$service_point_id"],"defaultServicePointId":"$service_point_id"}],"totalRecords":1}';
}

location ^~ /service-points {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"servicepoints":[{"id":"$service_point_id","name":"Main Service Point","code":"MAIN"}],"totalRecords":1}';
}

# Okapi self-description probes stripes-core makes after login
location = /_/version {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    default_type text/plain;
    return 200 '0.0.0-e2e-mock';
}

# Module discovery; empty list = no optional interfaces, same effect as
# the 404 the real fetch failure produced, minus the console noise
location ~ ^/_/proxy/tenants/[^/]+/modules$ {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '[]';
}

# mod-settings user preferences (e.g. stripes-core main-nav order)
location = /settings/entries {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 200 '{"items":[],"resultInfo":{"totalRecords":0}}';
}

# Proxy broker API calls to the broker container.
# The broker trusts these headers (Okapi mode): tenant scopes ownership,
# token/user id are only decoded for attribution.
location ^~ /broker/ {
    include /etc/nginx/cors.inc;
    proxy_connect_timeout 2s;
    proxy_hide_header Access-Control-Allow-Origin;
    proxy_hide_header Access-Control-Allow-Credentials;
    proxy_hide_header Access-Control-Methods;
    proxy_hide_header Access-Control-Allow-Headers;
    proxy_hide_header Access-Control-Expose-Headers;
    proxy_set_header Origin $http_origin;
    if ($request_method = OPTIONS) { return 204; }

    proxy_pass http://broker:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Okapi-Tenant $tenant;
    proxy_set_header X-Okapi-Token $token;

    # Keep server-sent events (GET /broker/sse/events) streaming
    proxy_buffering off;
    proxy_read_timeout 1h;
}

# Proxy directory API calls to the directory container. The directory trusts
# these headers: the tenant decides which entries are owned, the permissions
# which role the caller has.
location ^~ /directory/ {
    include /etc/nginx/cors.inc;
    proxy_connect_timeout 2s;
    if ($request_method = OPTIONS) { return 204; }

    proxy_pass http://directory:8086;
    proxy_set_header Host $host;
    proxy_set_header X-Okapi-Tenant $tenant;
    proxy_set_header X-Okapi-Permissions $directory_permissions;
}

# Catch-all for anything not mocked: loud JSON 404
location / {
    include /etc/nginx/cors.inc;
    if ($request_method = OPTIONS) { return 204; }
    return 404 '{"error":"mock okapi: unhandled path $request_uri"}';
}

error_log /dev/stderr;
access_log off;
