import styles from './App.module.scss';

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useList } from "./hooks/lists";
import Loader from './Loader';

export default function List() {
  const { name } = useParams();
  const { list, addItem, removeItem, loading } = useList(name ?? "");
  const [newItem, setNewItem] = useState("");
  return (
    <div className={styles['fixedColumn']}>
      <h4>{name}</h4>
      <Link to="/" className={styles['button']}>Back to home</Link>
      {list.map((item, i) => (
        <div key={i} className={styles['itemDiv']}>
          <div className={styles['item']}>
            {item}
          </div>
          <div onClick={() => {
            removeItem(item);
          }} className={styles[loading ? 'disabledItemButton' : 'itemButton']}>{loading ? <Loader /> : "X"}</div>
        </div>
      ))}
      <div className={styles['inputDiv']}>
        <label htmlFor="newList">New item</label>
        <input id="newList" type="text" value={newItem} onChange={e => setNewItem(e.target.value)} />
      </div>
      <div onClick={() => {
        addItem(newItem);
        setNewItem("");
      }} className={styles[loading ? 'disabledButton' : 'button']}>
        {loading ? <Loader /> : "Add item"}
      </div>
    </div>
  );
}