export class Subscriber {
  id?: string;
  email: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  ip?: string | null;

  constructor(builder: SubscriberBuilder) {
    this.id = builder.id;
    this.email = builder.email;
    this.createdAt = builder.createdAt;
    this.updatedAt = builder.updatedAt;
    this.ip = builder.ip;
  }

  static builder(): SubscriberBuilder {
    return new SubscriberBuilder();
  }

  toFirestore() {
    const data: Record<string, unknown> = {
      email: this.email,
    };
    if (this.createdAt !== undefined) data.createdAt = this.createdAt;
    if (this.updatedAt !== undefined) data.updatedAt = this.updatedAt;
    if (this.ip !== undefined) data.ip = this.ip;
    return data;
  }
}

export class SubscriberBuilder {
  id?: string;
  email: string = "";
  createdAt?: unknown;
  updatedAt?: unknown;
  ip?: string | null;

  setId(id: string): SubscriberBuilder {
    this.id = id;
    return this;
  }

  setEmail(email: string): SubscriberBuilder {
    this.email = email;
    return this;
  }

  setCreatedAt(createdAt: unknown): SubscriberBuilder {
    this.createdAt = createdAt;
    return this;
  }

  setUpdatedAt(updatedAt: unknown): SubscriberBuilder {
    this.updatedAt = updatedAt;
    return this;
  }

  setIp(ip: string | null): SubscriberBuilder {
    this.ip = ip;
    return this;
  }

  build(): Subscriber {
    const email = String(this.email || "").trim().toLowerCase();
    if (!email) throw new Error("Subscriber requires email");
    return new Subscriber({ ...this, email } as SubscriberBuilder);
  }
}

