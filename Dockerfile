FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node web/ /app/
RUN mkdir -p /var/lib/qalam && chown node:node /var/lib/qalam
USER node
ENV NODE_ENV=production PORT=3000 QALAM_DATA_DIR=/var/lib/qalam QALAM_SECURE_COOKIE=1
EXPOSE 3000
CMD ["node", "server.js"]
