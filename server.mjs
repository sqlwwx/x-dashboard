import path from 'path'
import tls from 'tls'
import assert from 'assert'
import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'

const __dirname = path.parse(new URL(import.meta.url).pathname).dir

const SERVER_DOMAIN = `${process.env.PROJECT_DOMAIN}.glitch.me`

const fastify = Fastify({
  logger: false,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

const loadDomainTlsInfo = (domain) => {
  assert(domain);
  return new Promise((resolve, reject) => {
    let socket;
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
      if (socket) {
        socket.destroy();
      }
    }, 5000);
    try {
      socket = tls.connect(
        {
          host: domain,
          port: 443,
          servername: domain,
        },
        (err) => {
          assert(socket.authorized);
          const {
            subject,
            issuer,
            subjectaltname,
            infoAccess,
            valid_from,
            valid_to,
          } = socket.getPeerCertificate();
          socket.destroy();
          clearTimeout(timer);
          resolve({
            domain,
            validFrom: new Date(valid_from).getTime(),
            validTo: new Date(valid_to).getTime(),
            timestamp: Date.now()
          });
        }
      );
      socket.on("error", (err) => {
        reject(new Error(err));
        clearTimeout(timer);
        socket.destroy();
      });
    } catch (err) {
      reject(new Error(err));
      clearTimeout(timer);
    }
  });
};

fastify.get("/api/Domain/tlsInfo", async function (request, reply) {
  const {
    query: { domain },
  } = request;
  reply.send(await loadDomainTlsInfo(domain || SERVER_DOMAIN));
});

fastify.listen(process.env.PORT, "0.0.0.0", function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
