export type LocationData = {
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
};

export class User {
  firstName: string;
  middleName?: string;
  lastName: string;
  address: string;
  state: string;
  city: string;
  zipCode: string;
  dob: string;
  mobile: string;
  phone?: string;
  email: string;
  accountType: string;
  currency: string;
  ssnPin: string;
  password?: string;
  passportUrl?: string;
  photoURL?: string;
  role: "user" | "admin";
  accountNumber?: string;
  balance?: number;
  accountStatus?: "ACTIVE" | "inactive";
  accountPin?: string;
  transferCode?: string;
  location?: LocationData;
  language?: string;
  kycDocuments?: Record<
    string,
    {
      url: string;
      version?: number;
      format?: string;
      bytes?: number;
      fileName?: string;
    }
  >;

  constructor(builder: UserBuilder) {
    this.firstName = builder.firstName;
    this.middleName = builder.middleName;
    this.lastName = builder.lastName;
    this.address = builder.address;
    this.state = builder.state;
    this.city = builder.city;
    this.zipCode = builder.zipCode;
    this.dob = builder.dob;
    this.mobile = builder.mobile;
    this.phone = builder.phone;
    this.email = builder.email;
    this.accountType = builder.accountType;
    this.currency = builder.currency;
    this.ssnPin = builder.ssnPin;
    this.password = builder.password;
    this.passportUrl = builder.passportUrl;
    this.photoURL = builder.photoURL;
    this.role = builder.role;
    this.accountNumber = builder.accountNumber;
    this.balance = builder.balance;
    this.accountStatus = builder.accountStatus;
    this.accountPin = builder.accountPin;
    this.transferCode = builder.transferCode;
    this.location = builder.location;
    this.language = builder.language;
    this.kycDocuments = builder.kycDocuments;
  }

  static builder(): UserBuilder {
    return new UserBuilder();
  }
}

export class UserBuilder {
  firstName: string = "";
  middleName?: string;
  lastName: string = "";
  address: string = "";
  state: string = "";
  city: string = "";
  zipCode: string = "";
  dob: string = "";
  mobile: string = "";
  phone?: string;
  email: string = "";
  accountType: string = "";
  currency: string = "";
  ssnPin: string = "";
  password?: string;
  passportUrl?: string;
  photoURL?: string;
  role: "user" | "admin" = "user";
  accountNumber?: string;
  balance?: number;
  accountStatus?: "ACTIVE" | "inactive";
  accountPin?: string;
  transferCode?: string;
  location?: LocationData;
  language?: string;
  kycDocuments?: Record<
    string,
    {
      url: string;
      version?: number;
      format?: string;
      bytes?: number;
      fileName?: string;
    }
  >;

  setFirstName(firstName: string): UserBuilder {
    this.firstName = firstName;
    return this;
  }

  setMiddleName(middleName: string): UserBuilder {
    this.middleName = middleName;
    return this;
  }

  setLastName(lastName: string): UserBuilder {
    this.lastName = lastName;
    return this;
  }

  setAddress(address: string): UserBuilder {
    this.address = address;
    return this;
  }

  setState(state: string): UserBuilder {
    this.state = state;
    return this;
  }

  setCity(city: string): UserBuilder {
    this.city = city;
    return this;
  }

  setZipCode(zipCode: string): UserBuilder {
    this.zipCode = zipCode;
    return this;
  }

  setDob(dob: string): UserBuilder {
    this.dob = dob;
    return this;
  }

  setMobile(mobile: string): UserBuilder {
    this.mobile = mobile;
    return this;
  }

  setPhone(phone: string): UserBuilder {
    this.phone = phone;
    return this;
  }

  setEmail(email: string): UserBuilder {
    this.email = email;
    return this;
  }

  setAccountType(accountType: string): UserBuilder {
    this.accountType = accountType;
    return this;
  }

  setCurrency(currency: string): UserBuilder {
    this.currency = currency;
    return this;
  }

  setSsnPin(ssnPin: string): UserBuilder {
    this.ssnPin = ssnPin;
    return this;
  }

  setPassword(password: string): UserBuilder {
    this.password = password;
    return this;
  }

  setPassportUrl(passportUrl: string): UserBuilder {
    this.passportUrl = passportUrl;
    return this;
  }

  setPhotoURL(photoURL: string): UserBuilder {
    this.photoURL = photoURL;
    return this;
  }

  setImage(image: string): UserBuilder {
    return this.setPhotoURL(image);
  }

  setRole(role: "user" | "admin"): UserBuilder {
    this.role = role;
    return this;
  }

  setAccountNumber(accountNumber: string): UserBuilder {
    this.accountNumber = accountNumber;
    return this;
  }

  setBalance(balance: number): UserBuilder {
    this.balance = balance;
    return this;
  }

  setAccountStatus(accountStatus: "ACTIVE" | "inactive"): UserBuilder {
    this.accountStatus = accountStatus;
    return this;
  }

  setAccountPin(accountPin: string): UserBuilder {
    this.accountPin = accountPin;
    return this;
  }

  setTransferCode(transferCode: string): UserBuilder {
    this.transferCode = transferCode;
    return this;
  }

  setLocation(location: LocationData): UserBuilder {
    this.location = location;
    return this;
  }

  setLanguage(language: string): UserBuilder {
    this.language = language;
    return this;
  }

  setKycDocuments(
    kycDocuments: Record<
      string,
      {
        url: string;
        version?: number;
        format?: string;
        bytes?: number;
        fileName?: string;
      }
    >,
  ): UserBuilder {
    this.kycDocuments = kycDocuments;
    return this;
  }

  build(): User {
    if (!this.firstName || !this.lastName || !this.email) {
      throw new Error("Missing required fields");
    }
    return new User(this);
  }
}
