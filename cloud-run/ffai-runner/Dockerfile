FROM dart:stable

ENV PATH="/root/.pub-cache/bin:${PATH}"
ENV PORT=8080
ENV FFAI_WORKSPACE=/workspace/custom_code_connect

ARG FLUTTERFLOW_CLI_VERSION=0.0.39
RUN dart pub global activate flutterflow_cli "$FLUTTERFLOW_CLI_VERSION" \
    && dart pub global list | grep -F "flutterflow_cli $FLUTTERFLOW_CLI_VERSION"

WORKDIR /app
COPY pubspec.yaml ./
RUN dart pub get

RUN mkdir -p /workspace

COPY bin/ ./bin/

EXPOSE 8080

CMD ["dart", "run", "bin/server.dart"]
