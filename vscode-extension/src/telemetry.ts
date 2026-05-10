export class Telemetry {
  static log(eventName: string, properties?: Record<string, any>) {
    console.log(`[Telemetry] ${eventName}`, properties);
  }
}
