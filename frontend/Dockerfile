FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_BASE_PATH=/comercial/
ARG VITE_API_URL=/comercial/api/v1
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
# Cria link simbólico /usr/share/nginx/html/comercial apontando para /usr/share/nginx/html
# para suportar proxies reversos na VPS tanto com strip de path quanto sem strip (/comercial/assets/*)
RUN ln -s /usr/share/nginx/html /usr/share/nginx/html/comercial
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
