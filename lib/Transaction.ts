export type TransactionType = "Deposit" | "Withdrawal";

export class Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  status: "pending" | "completed" | "failed";

  constructor(builder: TransactionBuilder) {
    this.id = builder.id;
    this.userId = builder.userId;
    this.type = builder.type;
    this.amount = builder.amount;
    this.date = builder.date;
    this.description = builder.description;
    this.status = builder.status;
  }

  static builder(): TransactionBuilder {
    return new TransactionBuilder();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      userId: this.userId,
      type: this.type,
      amount: this.amount,
      date: this.date,
      description: this.description || "",
      status: this.status,
    };
  }
}

export class TransactionBuilder {
  id?: string;
  userId: string = "";
  type: TransactionType = "Deposit";
  amount: number = 0;
  date: string = new Date().toISOString();
  description?: string;
  status: "pending" | "completed" | "failed" = "completed";

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

  setStatus(status: "pending" | "completed" | "failed"): TransactionBuilder {
    this.status = status;
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
