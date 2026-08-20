# DirectLink

`DirectLink` is a component that passes through its props to react-router's
`Link` but in the process will rewrite the `to` prop as an object and add a
`state: { direct: true }` property. This allow the linked route to determine if the
user has arrived there directly via an explicit in-app link vs. other
navigation such as switching between apps or directly entering the URL. An
optional `component` prop can be provided for another component to receive
the rewritten `to`, `Button` for example.


## useCloseDirect

`useCloseDirect(fallback)` returns an onClose handler that uses react-router's
location object to determine whether a DirectLink was used. If it was, going
back is safe: the user clicked a link here and the previous URL is where they
came from. Otherwise they arrived by some other route, having entered the URL
or come back from another app, and are sent to `fallback` instead. Without a
`fallback`, it goes one path segment up, keeping the search part of the URL.
