import { NavLink } from "react-router-dom";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <NavLink to="/">Home</NavLink>
      </div>

      <ul className={styles.navLinks}>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Home
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/about"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            About
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/contact"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Contact
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              isActive ? `${styles.login} ${styles.active}` : styles.login
            }
          >
            Login
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/signup"
            className={({ isActive }) =>
              isActive ? `${styles.signup} ${styles.active}` : styles.signup
            }
          >
            Signup
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
