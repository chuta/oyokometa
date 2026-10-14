import { CUSTOM_SERVICE, SOLUTION_SERVICES } from "@oyokometa/config";

export function ServiceCards() {
  return (
    <div className="service-grid">
      {SOLUTION_SERVICES.map((service) => (
        <article className="service-card" id={service.id} key={service.id}>
          <h3>{service.title}</h3>
          <p>{service.summary}</p>
          <ul>
            {service.useCases.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            <strong>Intended for. </strong>
            {service.customers}
          </p>
          <p className="field-hint">{service.limitation}</p>
          <a className="btn" href={`/request-solution?service=${service.id}`}>
            Request this
          </a>
        </article>
      ))}
      <article className="service-card" id={CUSTOM_SERVICE.id}>
        <h3>{CUSTOM_SERVICE.title}</h3>
        <p>{CUSTOM_SERVICE.summary}</p>
        <a className="btn" href={`/request-solution?service=${CUSTOM_SERVICE.id}`}>
          Describe a custom requirement
        </a>
      </article>
    </div>
  );
}
