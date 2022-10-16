// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './App.module.scss';

import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import { useLists } from './hooks/lists';
import { useState } from 'react';
import List from './List';
import Loader from './Loader';

export function App() {
  const { lists, addList, loading } = useLists();
  const [ newListName, setNewListName ] = useState("");
  const navigate = useNavigate();
  return (
    <div className={styles['root']}>
      <div className={styles['header']}>
        <h2 className={styles['title']} onClick={() => navigate("/")}>Todo Application</h2>
      </div>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <div>This simple application aims to provide some todo lists.</div>
              <div className={styles['fixedColumn']}>
                <Link to="/new" className={styles['button']}>Create new list</Link>
                {lists.map(listName => (
                  <Link key={listName} to={`/list/${listName}`} className={styles['button']}>Go to {listName}</Link>
                ))}
              </div>
            </>
          }
        />
        <Route
          path="/new"
          element={
            <div className={styles['fixedColumn']}>
              <div className={styles['inputDiv']}>
                <label htmlFor="newList">New list name</label>
                <input id="newList" type="text" value={newListName} onChange={e => setNewListName(e.target.value)} />
              </div>
              <div onClick={() => {
                if(!loading) {
                  addList(newListName);
                  setNewListName("");
                  navigate("/");
                }
              }} className={styles[loading ? 'disabledButton' : 'button']}>
                {loading ? <Loader/> : "Create"}
              </div>
              <Link to="/" className={styles['button']}>Cancel</Link>
            </div>
          }
        />
        <Route
          path="/list/:name"
          element={<List/>}
        />
      </Routes>
    </div>
  );
}

export default App;
