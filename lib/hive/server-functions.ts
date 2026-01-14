'use server';

import * as dhive from '@hiveio/dhive';
import { Client } from '@hiveio/dhive';
import crypto from 'crypto';

const client = new Client('https://api.hive.blog');

interface ServerLoginResponse {
  validation: { success: boolean; message: string };
  key?: string;
  type?: dhive.KeyRole;
}

function decryptPrivateKey(encryptedPrivateKey: string): string {
  const secret = process.env.NEXT_PUBLIC_CRYPTO_SECRET || '';

  if (!secret) {
    throw new Error('NEXT_PUBLIC_CRYPTO_SECRET is not set in the environment');
  }

  try {
    const [ivHex, encryptedHex] = encryptedPrivateKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const key = crypto.scryptSync(secret, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (_error) {
    throw new Error('Failed to decrypt the private key. Check the secret or the data.');
  }
}

function encryptPrivateKey(privateKey: dhive.PrivateKey) {
  const secret = process.env.NEXT_PUBLIC_CRYPTO_SECRET as string;

  if (!secret) {
    throw new Error('NEXT_PUBLIC_CRYPTO_SECRET is not set in the environment');
  }

  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(privateKey.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

async function getAccountByPassword(username: string, password: string) {
  const hivePrivateKey = dhive.PrivateKey.fromLogin(
    username,
    password,
    'posting',
  );
  const hivePublicKey = hivePrivateKey.createPublic();
  const val = await client.keys.getKeyReferences([hivePublicKey.toString()]);
  const accountName = val.accounts[0][0];

  return { accountName, hivePrivateKey };
}

export async function hiveServerLoginWithPassword(
  username: string,
  privateKey: string,
): Promise<ServerLoginResponse> {
  if (!username) {
    return { validation: { success: false, message: 'Empty username' } };
  }
  if (!privateKey) {
    return { validation: { success: false, message: 'Empty private key' } };
  }

  try {
    // Primeiro tenta como uma senha master
    const { accountName, hivePrivateKey } = await getAccountByPassword(
      username,
      privateKey,
    );

    if (accountName === username) {
      const encryptedKey = encryptPrivateKey(hivePrivateKey);
      return {
        validation: {
          success: true,
          message: 'User authenticated successfully',
        },
        key: encryptedKey,
        type: 'posting',
      };
    }
  } catch (_error) {
    // Se falhar, tenta como chave privada direta
    try {
      const hivePrivateKey = dhive.PrivateKey.fromString(privateKey);
      const hivePublicKey = hivePrivateKey.createPublic();
      const val = await client.keys.getKeyReferences([
        hivePublicKey.toString(),
      ]);
      const accountName = val.accounts[0][0];

      if (accountName === username) {
        const userData = await client.database.getAccounts([username]);
        const encryptedKey = encryptPrivateKey(hivePrivateKey);

        const userAccount = userData[0];

        // Verifica se é uma chave posting
        let checkAuth = userAccount.posting.key_auths;
        for (let i = 0, len = checkAuth.length; i < len; i++) {
          if (checkAuth[i][0] === hivePublicKey.toString()) {
            return {
              validation: {
                success: true,
                message: 'User authenticated successfully',
              },
              key: encryptedKey,
              type: 'posting',
            };
          }
        }

        // Verifica se é uma chave active
        checkAuth = userAccount.active.key_auths;
        for (let i = 0, len = checkAuth.length; i < len; i++) {
          if (checkAuth[i][0] === hivePublicKey.toString()) {
            return {
              validation: {
                success: true,
                message: 'User authenticated successfully',
              },
              key: encryptedKey,
              type: 'active',
            };
          }
        }

        // Verifica se é uma chave owner
        checkAuth = userAccount.owner.key_auths;
        for (let i = 0, len = checkAuth.length; i < len; i++) {
          if (checkAuth[i][0] === hivePublicKey.toString()) {
            return {
              validation: {
                success: true,
                message: 'User authenticated successfully',
              },
              key: encryptedKey,
              type: 'owner',
            };
          }
        }
      }
    } catch (keyError) {
      console.error('Private key validation error:', keyError);
    }
  }

  return { validation: { success: false, message: 'Invalid credentials' } };
}

export async function sendHiveOperation(
  encryptedPrivateKey: string | null,
  op: dhive.Operation[],
) {
  if (encryptedPrivateKey === null) {
    throw new Error('Private key not found');
  }
  const privateKey = decryptPrivateKey(encryptedPrivateKey);

  return client.broadcast
    .sendOperations(op, dhive.PrivateKey.from(privateKey))
    .then((result) => {
      console.log(result);
      console.log('Operation successful!');
      return result;
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
}
