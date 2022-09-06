/*** APP ***/
import React, { useState } from "react";
import { render } from "react-dom";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
  useMutation,
} from "@apollo/client";

import { link } from "./link.js";
import "./index.css";

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

const ALL_PEOPLE = gql`
  query AllPeople {
    people {
      id
      name
    }
  }
`;

const SINGLE_PERSON = gql`
  query SinglePerson($id: ID!) {
    person(id: $id) {
      id
      name
    }
  }
`;

const ADD_PERSON = gql`
  mutation AddPerson($name: String) {
    addPerson(name: $name) {
      id
      name
    }
  }
`;

const PersonComponent: React.FC<{ id: string }> = ({ id }) => {
  const [completedCount, setCompletedCount] = React.useState(0);
  const [enabled, setEnabled] = React.useState(false);
  const handleCompleted = React.useCallback(() => {
    setCompletedCount((c) => c + 1);
  }, [setCompletedCount]);

  const { data } = useQuery(SINGLE_PERSON, {
    variables: { id },
    onCompleted: handleCompleted,
  });

  const appendToName = React.useCallback(() => {
    const personResult = client.readQuery({
      query: SINGLE_PERSON,
      variables: { id },
    });

    if (!personResult) {
      return;
    }

    client.writeQuery({
      query: SINGLE_PERSON,
      variables: { id },
      data: {
        ...personResult,
        person: {
          ...personResult.person,
          name: personResult.person.name + "1",
        },
      },
    });
  }, [id]);

  const handleClick = React.useCallback(() => {
    appendToName();
  }, [appendToName]);

  return (
    <div>
      <button onClick={handleClick}>Update person's name via writeQuery</button>
      <div>
        In 3.4.x, the onCompleted callback was not called from these cache
        updates
      </div>
      <div>onCompleted count: {completedCount}</div>
    </div>
  );
};

function App() {
  const [name, setName] = useState("");
  const { loading, data } = useQuery(ALL_PEOPLE);

  const [addPerson] = useMutation(ADD_PERSON, {
    update: (cache, { data: { addPerson: addPersonData } }) => {
      const peopleResult = cache.readQuery({ query: ALL_PEOPLE });

      cache.writeQuery({
        query: ALL_PEOPLE,
        data: {
          ...peopleResult,
          people: [...peopleResult.people, addPersonData],
        },
      });
    },
  });

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>
      <div className="add-person">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(evt) => setName(evt.target.value)}
        />
        <button
          onClick={() => {
            addPerson({ variables: { name } });
            setName("");
          }}
        >
          Add person
        </button>
      </div>
      <h2>Names</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {data?.people.map((person) => (
            <li key={person.id}>{person.name}</li>
          ))}
        </ul>
      )}
      <PersonComponent id={2} />
    </main>
  );
}

const container = document.getElementById("root");
render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  container
);
