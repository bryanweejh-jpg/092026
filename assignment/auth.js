/* ---------------------------------------------------------------
   DEMO ACCOUNT STORE (browser only)
   Accounts are saved in this browser's localStorage, so they exist
   only on the device that created them. Passwords are salted and
   hashed, but this is still NOT secure enough for a live shop.
   For a real site, replace TT.register() and TT.login() with
   requests to your server (see the fetch example in login.html).
--------------------------------------------------------------- */
const TT = (() => {
  const KEY = 'tt_accounts';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      const err = new Error('Storage unavailable');
      err.code = 'storage';
      throw err;
    }
  }

  function makeSalt() {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function hash(password, salt) {
    const data = salt + ':' + password;

    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(data)
      );

      return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Fallback for browsers without Web Crypto (weaker, demo only)
    let h = 5381;

    for (const c of data) {
      h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    }

    return 'x' + h;
  }

  async function register(username, email, password) {
    const list = load();
    const u = username.toLowerCase();
    const e = email.toLowerCase();

    if (
      u === 'angler' ||
      list.some(a => a.username.toLowerCase() === u)
    ) {
      const err = new Error('Username taken');
      err.code = 'username';
      throw err;
    }

    if (list.some(a => a.email.toLowerCase() === e)) {
      const err = new Error('Email taken');
      err.code = 'email';
      throw err;
    }

    const salt = makeSalt();

    list.push({
      username,
      email,
      salt,
      hash: await hash(password, salt),
      created: Date.now()
    });

    save(list);
  }

  async function login(identifier, password) {
    const id = identifier.toLowerCase();

    // Built-in demo account for testing
    if (id === 'angler' && password === 'tightlines1') {
      return { name: 'Angler' };
    }

    const account = load().find(
      a =>
        a.username.toLowerCase() === id ||
        a.email.toLowerCase() === id
    );

    if (
      account &&
      account.hash === await hash(password, account.salt)
    ) {
      return { name: account.username };
    }

    throw new Error('Invalid credentials');
  }

  // Check whether an email belongs to a saved account
  function emailExists(email) {
    const e = email.trim().toLowerCase();

    return load().some(
      a => a.email.toLowerCase() === e
    );
  }

  // Return the saved username and email for an email (no hash/salt),
  // or null if there is no matching account
  function findByEmail(email) {
    const e = email.trim().toLowerCase();
    const account = load().find(a => a.email.toLowerCase() === e);

    return account
      ? { username: account.username, email: account.email }
      : null;
  }

  // Update the existing account instead of creating a duplicate
  async function resetAccount(oldEmail, username, newEmail, password) {
    const list = load();

    const old = oldEmail.trim().toLowerCase();
    const u = username.trim().toLowerCase();
    const e = newEmail.trim().toLowerCase();

    // Find the existing account using its original email
    const index = list.findIndex(
      a => a.email.toLowerCase() === old
    );

    if (index === -1) {
      throw new Error('Email not found');
    }

    // Prevent using another account's username
    if (
      u === 'angler' ||
      list.some(
        (a, i) =>
          i !== index &&
          a.username.toLowerCase() === u
      )
    ) {
      const err = new Error('Username taken');
      err.code = 'username';
      throw err;
    }

    // Prevent using another account's email
    if (
      list.some(
        (a, i) =>
          i !== index &&
          a.email.toLowerCase() === e
      )
    ) {
      const err = new Error('Email taken');
      err.code = 'email';
      throw err;
    }

    // Generate a new salt and password hash
    const salt = makeSalt();
    const passwordHash = await hash(password, salt);

    // Replace only the matching account
    list[index] = {
      username: username.trim(),
      email: newEmail.trim(),
      salt,
      hash: passwordHash,
      created: list[index].created
    };

    save(list);
  }

  return {
    register,
    login,
    emailExists,
    findByEmail,
    resetAccount
  };
})();
