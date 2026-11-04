FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production BIND_HOST=0.0.0.0 PORT=4187
COPY --chown=node:node . /app
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 4187
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:4187/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
