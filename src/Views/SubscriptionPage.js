import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode"; 
import "../styles/SubscriptionPage.css";
import subscriptionImg from "../images/subscriptionImg.png";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const userProfile = JSON.parse(localStorage.getItem("userProfile"));
  const [subscriptionTypes, setSubscriptionTypes] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

  const getToken = () => localStorage.getItem("jwtToken");

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });

    instance.interceptors.request.use((config) => {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userProfile");
        navigate("/login");
        return Promise.reject({ message: "Token expired" });
      }
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return config;
    });

    instance.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userProfile");
          navigate("/login");
        }
        return Promise.reject(err);
      }
    );

    return instance;
  }, [navigate, API_BASE]);


  useEffect(() => {
    const jwtToken = getToken();
    const userEmail = userProfile?.email;

    if (!userEmail || !jwtToken) {
      setError("Please log in to subscribe.");
      setLoading(false);
      return;
    }

    const fetchSubscriptions = async () => {
      try {
        const [typesRes, userSubsRes] = await Promise.all([
          api.get("/subscription/getAll"),
          api.get("/api/user-subscriptions/me"),
        ]);

        setSubscriptionTypes(typesRes.data || []);
        setUserSubscriptions(userSubsRes.data || []);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.status === 401 || err.response?.status === 403
            ? "Unauthorized access. Please log in."
            : "Failed to load subscriptions. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [api, userProfile]);


  const isSubscribed = (planName) =>
    userSubscriptions.some((sub) => sub.name === planName);

 
  const subscribe = async (type) => {
    try {
      const res = await api.post("/api/user-subscriptions", {
        name: type.name,
        price: type.price,
        duration: type.duration,
      });
      setUserSubscriptions((prev) => [...prev, res.data]);
      alert(`Successfully subscribed to ${type.name} ✅`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        alert("You already have an active subscription!");
      } else {
        alert(err.response?.data?.error || "Failed to subscribe ❌");
      }
    }
  };

 
  const cancelSubscription = async () => {
    try {
      const res = await api.delete("/api/user-subscriptions/me");
      alert("Subscription cancelled successfully ✅");
      setUserSubscriptions([]); 
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to cancel subscription ❌");
    }
  };

  if (loading) return <p>Loading subscriptions...</p>;
  if (error) return <p>{error}</p>;
  if (!userProfile || !getToken()) return <p>Please log in to subscribe.</p>;

  return (
    <div className="subscription-page">
      <nav className="subscription-navbar">
        <h1>Subscription</h1>
        <div className="navbar-right">
          <button
            className="navbar-btn dashboard"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      </nav>

      <header className="subscription-header">
        <h1>Level up your forecast</h1>
      </header>

      <div className="subscription-image">
        <img src={subscriptionImg} alt="Subscription Preview" />
      </div>

      <section className="plans-section">
        {subscriptionTypes.map((type) => {
          const subscribed = isSubscribed(type.name);
          return (
            <div key={type.subscriptionId} className="plan-card">
              {subscribed && <div className="subscribed-badge">Subscribed</div>}
              {type.trial && !subscribed && (
                <div className="trial-badge">{type.trial}</div>
              )}
              <h2>{type.name}</h2>
              <p className="price">
                R{type.price} <span>{type.billing}</span>
              </p>
              <div className="features-list">
                {type.features?.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <span>✔</span> {feature}
                  </div>
                ))}
              </div>

              {subscribed ? (
                <>
                  <button
                    className="subscribe-btn subscribed-btn"
                    disabled
                  >
                    Subscribed
                  </button>
                  <button
                    onClick={cancelSubscription}
                    className="cancel-btn"
                    style={{
                      marginTop: "10px",
                      backgroundColor: "#ff4d4f",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel Subscription
                  </button>
                </>
              ) : (
                <button
                  onClick={() => subscribe(type)}
                  className="subscribe-btn"
                >
                  {type.trial ? "Start My Trial" : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
