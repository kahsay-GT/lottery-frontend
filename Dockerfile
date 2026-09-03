# ── builder stage ───────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build args passed at build time (e.g. --build-arg VITE_API_URL=https://...)
ARG VITE_API_URL
ARG VITE_APP_NAME="Edilegna | ዕድለኛ"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
RUN npm run build

# ── runner stage (nginx) ─────────────────────────
FROM nginx:1.27-alpine AS runner
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
