export class ContactMessage {
  id?: string;
  userId?: string | null;
  name: string;
  email: string;
  subject?: string;
  message: string;
  ip?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;

  constructor(init: {
    id?: string;
    userId?: string | null;
    name: string;
    email: string;
    subject?: string;
    message: string;
    ip?: string | null;
    createdAt?: unknown;
    updatedAt?: unknown;
  }) {
    this.id = init.id;
    this.userId = init.userId;
    this.name = init.name;
    this.email = init.email;
    this.subject = init.subject;
    this.message = init.message;
    this.ip = init.ip;
    this.createdAt = init.createdAt;
    this.updatedAt = init.updatedAt;
  }

  static builder(): ContactMessageBuilder {
    return new ContactMessageBuilder();
  }

  toFirestore() {
    const data: Record<string, unknown> = {
      name: this.name,
      email: this.email,
      message: this.message,
    };
    if (this.userId !== undefined) data.userId = this.userId;
    if (this.subject !== undefined) data.subject = this.subject;
    if (this.ip !== undefined) data.ip = this.ip;
    if (this.createdAt !== undefined) data.createdAt = this.createdAt;
    if (this.updatedAt !== undefined) data.updatedAt = this.updatedAt;
    return data;
  }
}

export class ContactMessageBuilder {
  id?: string;
  userId?: string | null;
  name: string = "";
  email: string = "";
  subject?: string;
  message: string = "";
  ip?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;

  setId(id: string): ContactMessageBuilder {
    this.id = id;
    return this;
  }

  setUserId(userId: string | null): ContactMessageBuilder {
    this.userId = userId;
    return this;
  }

  setName(name: string): ContactMessageBuilder {
    this.name = name;
    return this;
  }

  setEmail(email: string): ContactMessageBuilder {
    this.email = email;
    return this;
  }

  setSubject(subject: string): ContactMessageBuilder {
    this.subject = subject;
    return this;
  }

  setMessage(message: string): ContactMessageBuilder {
    this.message = message;
    return this;
  }

  setIp(ip: string | null): ContactMessageBuilder {
    this.ip = ip;
    return this;
  }

  setCreatedAt(createdAt: unknown): ContactMessageBuilder {
    this.createdAt = createdAt;
    return this;
  }

  setUpdatedAt(updatedAt: unknown): ContactMessageBuilder {
    this.updatedAt = updatedAt;
    return this;
  }

  build(): ContactMessage {
    const name = String(this.name || "").trim();
    const email = String(this.email || "").trim().toLowerCase();
    const message = String(this.message || "").trim();
    const subject = this.subject !== undefined ? String(this.subject).trim() : undefined;
    if (!name) throw new Error("ContactMessage requires name");
    if (!email) throw new Error("ContactMessage requires email");
    if (!message) throw new Error("ContactMessage requires message");
    return new ContactMessage({
      id: this.id,
      userId: this.userId,
      name,
      email,
      subject,
      message,
      ip: this.ip,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}
