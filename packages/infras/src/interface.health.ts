export abstract class InterfaceHealth<T> {
  private clients: Array<T> = [];

  register(client: T) {
    this.clients.push(client);
  }

  abstract check(client: T): Promise<boolean>;

  async isHealthy(): Promise<boolean> {
    const reqs: Array<Promise<boolean>> = [];
    for (const client of this.clients) {
      reqs.push(this.check(client));
    }
    const results = await Promise.all(reqs);
    for (const result of results) {
      if (result === false) {
        return false;
      }
    }
    return true;
  }
}
