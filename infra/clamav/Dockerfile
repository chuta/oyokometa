FROM clamav/clamav:stable

# The API reaches clamd over Fly private networking (IPv6); Fly health checks probe IPv4. Uploads are capped at 25 MB.
RUN sed -i -e '/^TCPAddr/d' -e '/^StreamMaxLength/d' /etc/clamav/clamd.conf \
  && printf 'TCPAddr ::\nTCPAddr 0.0.0.0\nStreamMaxLength 30M\n' >> /etc/clamav/clamd.conf
