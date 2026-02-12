export type TransactionType = "deposit" | "withdrawal" | "transfer" | "credit" | "debit";
export type TransactionDirection = "incoming" | "outgoing";
export type TransactionStatus = "pending" | "completed" | "failed" | "success";

export class Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  status: TransactionStatus;
  direction?: TransactionDirection;
  senderName?: string;
  receiverName?: string;

  constructor(builder: TransactionBuilder) {
    this.id = builder.id;
    this.userId = builder.userId;
    this.type = builder.type;
    this.amount = builder.amount;
    this.date = builder.date;
    this.description = builder.description;
    this.status = builder.status;
    this.direction = builder.direction;
    this.senderName = builder.senderName;
    this.receiverName = builder.receiverName;
  }

  static get Builder() {
    return TransactionBuilder;
  }

  static builder(): TransactionBuilder {
    return new TransactionBuilder();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    const data: any = {
      userId: this.userId,
      type: this.type,
      amount: this.amount,
      date: this.date,
      description: this.description || "",
      status: this.status,
    };
    if (this.direction) data.direction = this.direction;
    if (this.senderName) data.senderName = this.senderName;
    if (this.receiverName) data.receiverName = this.receiverName;
    return data;
  }
}

export class TransactionBuilder {
  id?: string;
  userId: string = "";
  type: TransactionType = "deposit";
  amount: number = 0;
  date: string = new Date().toISOString();
  description?: string;
  status: TransactionStatus = "completed";
  direction?: TransactionDirection;
  senderName?: string;
  receiverName?: string;

  setId(id: string): TransactionBuilder {
    this.id = id;
    return this;
  }

  setUserId(userId: string): TransactionBuilder {
    this.userId = userId;
    return this;
  }

  setType(type: TransactionType): TransactionBuilder {
    this.type = type;
    return this;
  }

  setAmount(amount: number): TransactionBuilder {
    if (amount < 0) throw new Error("Amount cannot be negative");
    this.amount = amount;
    return this;
  }

  setDate(date: string): TransactionBuilder {
    this.date = date;
    return this;
  }

  setDescription(description: string): TransactionBuilder {
    this.description = description;
    return this;
  }

  setStatus(status: TransactionStatus): TransactionBuilder {
    this.status = status;
    return this;
  }

  setDirection(direction: TransactionDirection): TransactionBuilder {
    this.direction = direction;
    return this;
  }

  setSenderName(name: string): TransactionBuilder {
    this.senderName = name;
    return this;
  }

  setReceiverName(name: string): TransactionBuilder {
    this.receiverName = name;
    return this;
  }

  build(): Transaction {
    if (!this.userId) {
      throw new Error("Transaction must belong to a user");
    }
    if (this.amount <= 0) {
      throw new Error("Transaction amount must be greater than 0");
    }
    return new Transaction(this);
  }
}
