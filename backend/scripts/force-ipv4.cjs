const dns = require('node:dns');

// Force Node.js DNS resolver to prefer IPv4 over IPv6.
// This prevents connection timeouts when attempting to connect to public RPC endpoints
// (like forno.celo.org or mainnet.base.org) over networks where IPv6 is misconfigured or blocked.
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
