import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

export default function Navbar() {
  console.log("hiii");
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link to="/">Home</Link>
      </div>

      <ul className={styles.navLinks}>
        <li>
          <Link to="/">Home</Link>
        </li>

        <li>
          <Link to="/about">About</Link>
        </li>

        <li>
          <Link to="/contact">Contact</Link>
        </li>

        <li>
          <Link to="/login" className={styles.login}>
            Login
          </Link>
        </li>

        <li>
          <Link to="/signup" className={styles.signup}>
            Signup
          </Link>
        </li>
      </ul>
    </nav>
  );
}
