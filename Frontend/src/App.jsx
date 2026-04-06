import { useRef, useState, useEffect } from "react";
import "./App.css";
import Navbar from "./Component/Navbar";
import Hero_section from "./Component/Hero-section";
import About from "./Component/About";
import Project from "./Component/Project";
import AdminDashboard from "./Component/AdminDashboard";

function App() {
  const SECRET_ADMIN_CODE = "duyetbai123";
  const SECRET_ADMIN_OTP = "3009";
  const pathname = window.location.pathname;
  const isAdminRoute = pathname === "/admin-dashboard-hidden";
  const homeref = useRef(null);
  const projectref = useRef(null);
  const aboutref = useRef(null);
  const keyBufferRef = useRef("");
  const activationLockRef = useRef(false);
  const toastTimerRef = useRef(null);
  const confirmTimerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAdminToast, setShowAdminToast] = useState(false);

  const showOtpVerificationPopup = async () => {
    const Swal = window.Swal;

    if (!Swal) {
      return window.prompt("Nhập mã OTP 4 số để bật Admin Mode") === SECRET_ADMIN_OTP;
    }

    const result = await Swal.fire({
      title: "Xác thực Admin",
      html: `
        <div class="otp-box-wrap">
          <p>Nhập mã 4 số để tiếp tục</p>
          <div class="otp-code-group" id="otp-code-group">
            <input class="otp-digit" type="text" inputmode="numeric" maxlength="1" autocomplete="off" />
            <input class="otp-digit" type="text" inputmode="numeric" maxlength="1" autocomplete="off" />
            <input class="otp-digit" type="text" inputmode="numeric" maxlength="1" autocomplete="off" />
            <input class="otp-digit" type="text" inputmode="numeric" maxlength="1" autocomplete="off" />
          </div>
        </div>
      `,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
      showCancelButton: true,
      allowOutsideClick: false,
      didOpen: () => {
        const inputs = Array.from(document.querySelectorAll(".otp-digit"));

        if (!inputs.length) {
          return;
        }

        inputs[0].focus();

        inputs.forEach((input, index) => {
          input.addEventListener("input", (event) => {
            const target = event.target;
            target.value = target.value.replace(/\D/g, "").slice(0, 1);

            if (target.value && index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
          });

          input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && !input.value && index > 0) {
              inputs[index - 1].focus();
            }
          });
        });
      },
      preConfirm: () => {
        const inputs = Array.from(document.querySelectorAll(".otp-digit"));
        const otpValue = inputs.map((input) => input.value).join("");

        if (otpValue === SECRET_ADMIN_OTP) {
          return true;
        }

        const group = document.getElementById("otp-code-group");
        if (group) {
          group.classList.remove("otp-shake");
          void group.offsetWidth;
          group.classList.add("otp-shake");
        }

        inputs.forEach((input) => {
          input.value = "";
        });

        if (inputs[0]) {
          inputs[0].focus();
        }

        return false;
      },
    });

    return result.isConfirmed;
  };

  const showAdminRedirectPopup = async () => {
    const Swal = window.Swal;

    if (!Swal) {
      return window.confirm("Chuyển sang trang admin?");
    }

    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success",
        cancelButton: "btn btn-danger",
      },
      buttonsStyling: false,
    });

    const result = await swalWithBootstrapButtons.fire({
      title: "Chuyển sang trang admin?",
      text: "Bạn sẽ vào khu vực quản trị ẩn.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Có, chuyển ngay!",
      cancelButtonText: "Không, ở lại",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      await swalWithBootstrapButtons.fire({
        title: "Admin Mode Active",
        text: "Đang chuyển đến trang quản trị...",
        icon: "success",
      });
      return true;
    }

    if (result.dismiss === Swal.DismissReason.cancel) {
      await swalWithBootstrapButtons.fire({
        title: "Đã hủy",
        text: "Bạn vẫn đang ở trang public.",
        icon: "info",
      });
    }

    return false;
  };

  useEffect(() => {
    if (isAdminRoute) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.style.paddingTop = "0px";
      return;
    }

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    document.body.style.paddingTop = "70px";
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const handleKeydown = (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1
      ) {
        return;
      }

      keyBufferRef.current =
        `${keyBufferRef.current}${event.key.toLowerCase()}`.slice(
          -SECRET_ADMIN_CODE.length,
        );

      if (
        keyBufferRef.current !== SECRET_ADMIN_CODE ||
        activationLockRef.current
      ) {
        return;
      }

      activationLockRef.current = true;

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }

      confirmTimerRef.current = setTimeout(async () => {
        const otpAccepted = await showOtpVerificationPopup();

        if (!otpAccepted) {
          activationLockRef.current = false;
          keyBufferRef.current = "";
          return;
        }

        setShowAdminToast(true);
        toastTimerRef.current = setTimeout(() => {
          setShowAdminToast(false);
        }, 2400);

        const accepted = await showAdminRedirectPopup();
        activationLockRef.current = false;
        keyBufferRef.current = "";

        if (accepted) {
          window.location.assign("/admin-dashboard-hidden");
        }
      }, 420);
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
    };
  }, [isAdminRoute]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  return isAdminRoute ? (
    <AdminDashboard
      onBackToSite={() => {
        window.history.pushState({}, "", "/");
        window.location.reload();
      }}
    />
  ) : (
    <div>
      {showAdminToast ? (
        <div className="admin-mode-toast" role="status" aria-live="polite">
          <i className="bi bi-shield-lock-fill" />
          <div>
            <strong>Admin Mode Active</strong>
            <p>Secret code accepted</p>
          </div>
        </div>
      ) : null}
      <Navbar
        onHome={() => homeref.current.scrollIntoView({ behavior: "smooth" })}
        onProject={() =>
          projectref.current.scrollIntoView({ behavior: "smooth" })
        }
        onAbout={() => aboutref.current.scrollIntoView({ behavior: "smooth" })}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      <div ref={homeref}>
        <Hero_section
          onProject={() =>
            projectref.current.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>

      <div ref={projectref}>
        <Project />
      </div>
      <div ref={aboutref}>
        <About
          onProject={() =>
            projectref.current.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>
    </div>
  );
}

export default App;
