#stage 1 : build
FROM node:22-alpine AS builder 
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

#Accept NEXT_PUBLIC_API_URL at build time curcial for next.js #ARG is build time #CMD is runtime 
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

#Stage 2: Runner 
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]


