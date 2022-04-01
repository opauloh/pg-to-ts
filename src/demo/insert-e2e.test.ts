import PgPromise from 'pg-promise';

import {Queryable, TypedSQL} from './db-utils';
import {tables} from './demo-schema';

const typedDb = new TypedSQL(tables);

const userTable = typedDb.table('users');
// const commentsTable = typedDb.table('comment');
// const docTable = typedDb.table('doc');
const pgp = PgPromise();

afterAll(() => {
  pgp.end();
});

describe('insert', () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Must set POSTGRES_URL to run unit tests');
  }
  const rawDb = pgp(process.env.POSTGRES_URL);
  const db: Queryable & {q: string; args: string[]} = {
    q: '',
    args: [],
    query(q, args) {
      this.q = q;
      this.args = args;
      return rawDb.query(q, args);
    },
  };

  // Run all tests in a transaction and roll it back to avoid mutating the DB.
  beforeEach(async () => db.query('BEGIN'));
  afterEach(async () => db.query('ROLLBACK'));

  const insertUser = userTable.insert().fn();
  const selectAllUsers = userTable.select().fn();

  it('should insert a user', async () => {
    const initUsers = await selectAllUsers(db);
    expect(initUsers).toHaveLength(2);

    await insertUser(db, {name: 'John Doe', pronoun: 'he/him'});
    const users = await selectAllUsers(db);
    expect(users).toHaveLength(3);

    expect(users[2]).toMatchObject({
      name: 'John Doe',
      pronoun: 'he/him',
      id: expect.stringMatching(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      ),
    });
  });
});
