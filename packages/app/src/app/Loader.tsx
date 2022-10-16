import styles from './App.module.scss';

export default function Loader() {
  return <div className={styles['lds-dual-ring']}/>;
}