const userModel = require("../models/user.model");
const crypto = require("crypto");

module.exports.createUser = async (firstname, lastname, email, password, phone) => {
  if (!firstname || !email || !password || !phone) {
    throw new Error("All fields are required");
  }

  const hashedPassword = await userModel.hashPassword(password);

  const user = await userModel.create({
    fullname: {
      firstname,
      lastname,
    },
    email,
    password: hashedPassword,
    phone,
  });

  return user;
};

// Auto-provisioning for server-to-server callers (e.g. a Super App) that have
// already authenticated the end user themselves: looks the account up by
// email and transparently creates one on first sight instead of forcing a
// signup form. A random password is generated since the schema requires one,
// but the account never logs in through our own password flow.
module.exports.findOrCreateByEmail = async ({ email, firstName, lastName, phone, username }) => {
  if (!email) {
    throw new Error("Customer email is required");
  }

  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    // Keep the QuickRide profile in sync with whatever the Super App has on
    // file. Without this, an account created before phone/name were wired
    // up on the Super App side (or before the caller had them on file yet)
    // stayed missing those fields forever — this only ran once, at creation.
    // Never blanks out an existing value with an absent/empty incoming one.
    let changed = false;
    if (phone && existingUser.phone !== phone) {
      existingUser.phone = phone;
      changed = true;
    }
    existingUser.fullname = existingUser.fullname || {};
    if (firstName && existingUser.fullname.firstname !== firstName) {
      existingUser.fullname.firstname = firstName;
      changed = true;
    }
    if (lastName && existingUser.fullname.lastname !== lastName) {
      existingUser.fullname.lastname = lastName;
      changed = true;
    }
    if (changed) await existingUser.save();
    return existingUser;
  }

  const randomPassword = await userModel.hashPassword(crypto.randomBytes(24).toString("hex"));

  const user = await userModel.create({
    fullname: {
      firstname: firstName || username || "Khach hang",
      ...(lastName ? { lastname: lastName } : {}),
    },
    email,
    password: randomPassword,
    ...(phone ? { phone } : {}),
    // The Super App already verified this person's identity before calling us.
    emailVerified: true,
  });

  return user;
};
