#!/bin/sh
# Run by the nginx image's entrypoint before nginx starts. Loads njs, which
# mock-okapi.conf uses for token expirations: load_module only works in
# nginx.conf's main context, not in the conf.d include. A container restart
# runs this again, and a second load_module stops nginx from starting.
set -e
conf=/etc/nginx/nginx.conf
grep -q ngx_http_js_module "$conf" ||
  sed -i '1i load_module modules/ngx_http_js_module.so;' "$conf"
