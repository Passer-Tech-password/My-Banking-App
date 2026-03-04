export type CardNetwork = "VISA" | "MasterCard" | "Amex";

export class Card {
  id?: string;
  network: CardNetwork;
  number: string;
  holder: string;
  expires: string;
  cvv: string;

  constructor(builder: CardBuilder) {
    this.id = builder.id;
    this.network = builder.network;
    this.number = builder.number;
    this.holder = builder.holder;
    this.expires = builder.expires;
    this.cvv = builder.cvv;
  }

  static get Builder() {
    return CardBuilder;
  }

  static builder(): CardBuilder {
    return new CardBuilder();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      network: this.network,
      number: this.number,
      holder: this.holder,
      expires: this.expires,
      cvv: this.cvv,
    };
  }
}

export class CardBuilder {
  id?: string;
  network: CardNetwork = "VISA";
  number: string = "";
  holder: string = "";
  expires: string = "";
  cvv: string = "";

  setId(id: string): CardBuilder {
    this.id = id;
    return this;
  }

  setNetwork(network: CardNetwork): CardBuilder {
    this.network = network;
    return this;
  }

  setNumber(number: string): CardBuilder {
    this.number = number;
    return this;
  }

  setHolder(holder: string): CardBuilder {
    this.holder = holder;
    return this;
  }

  setExpires(expires: string): CardBuilder {
    this.expires = expires;
    return this;
  }

  setCvv(cvv: string): CardBuilder {
    this.cvv = cvv;
    return this;
  }

  build(): Card {
    if (!this.number || !this.holder || !this.expires || !this.cvv) {
      throw new Error("Missing required card fields");
    }
    return new Card(this);
  }
}
