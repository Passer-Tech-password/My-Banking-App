export type CardRequestStatus = "pending" | "approved" | "rejected";

export class CardRequest {
  id?: string;
  userId: string;
  email: string;
  status: CardRequestStatus;
  cardId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;

  constructor(builder: CardRequestBuilder) {
    this.id = builder.id;
    this.userId = builder.userId;
    this.email = builder.email;
    this.status = builder.status;
    this.cardId = builder.cardId;
    this.createdAt = builder.createdAt;
    this.updatedAt = builder.updatedAt;
  }

  static builder(): CardRequestBuilder {
    return new CardRequestBuilder();
  }

  toFirestore() {
    const data: Record<string, unknown> = {
      userId: this.userId,
      email: this.email,
      status: this.status,
    };
    if (this.cardId) data.cardId = this.cardId;
    if (this.createdAt !== undefined) data.createdAt = this.createdAt;
    if (this.updatedAt !== undefined) data.updatedAt = this.updatedAt;
    return data;
  }
}

export class CardRequestBuilder {
  id?: string;
  userId: string = "";
  email: string = "";
  status: CardRequestStatus = "pending";
  cardId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;

  setId(id: string): CardRequestBuilder {
    this.id = id;
    return this;
  }

  setUserId(userId: string): CardRequestBuilder {
    this.userId = userId;
    return this;
  }

  setEmail(email: string): CardRequestBuilder {
    this.email = email;
    return this;
  }

  setStatus(status: CardRequestStatus): CardRequestBuilder {
    this.status = status;
    return this;
  }

  setCardId(cardId: string): CardRequestBuilder {
    this.cardId = cardId;
    return this;
  }

  setCreatedAt(createdAt: unknown): CardRequestBuilder {
    this.createdAt = createdAt;
    return this;
  }

  setUpdatedAt(updatedAt: unknown): CardRequestBuilder {
    this.updatedAt = updatedAt;
    return this;
  }

  build(): CardRequest {
    if (!this.userId) throw new Error("CardRequest requires userId");
    if (!this.email) throw new Error("CardRequest requires email");
    if (this.status !== "pending" && this.status !== "approved" && this.status !== "rejected") {
      throw new Error("CardRequest has invalid status");
    }
    return new CardRequest(this);
  }
}

