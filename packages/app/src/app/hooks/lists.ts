import { ListObject, RootObject } from "@todo-application/todo-api";
import { useEffect, useState } from "react";

export function useConfig() {
  const [config, setConfig] = useState<{
    apiGatewayUrl: string
  }>({
    apiGatewayUrl: ""
  });

  useEffect(() => {
    fetch("/assets/config.json")
      .then(data => data.json())
      .then(setConfig)
      .catch(e => {
        console.error("An error occured while fetching config: ", e);
      })
  }, []);

  return config;
}

export function useLists() {
  const [lists, setLists] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { apiGatewayUrl } = useConfig();

  useEffect(() => {
    if(apiGatewayUrl !== "") {
      setLoading(true);
      fetch(`${apiGatewayUrl}get?type=root`)
        .then(data => data.json())
        .then((data: RootObject) => {
          setLists(data.lists);
        })
        .catch(e => {
          console.error("An error occured while fetching lists: ", e);
        })
        .finally(() => setLoading(false));
    }
  }, [apiGatewayUrl]);

  function addList(listName: string) {
    if(apiGatewayUrl !== "") {
      setLoading(true);
      fetch(`${apiGatewayUrl}create`, {
        method: "POST",
        body: JSON.stringify({
          type: "list",
          name: listName,
        }),
      })
        .then(data => data.json())
        .then(data => {
          if(data.success) {
            setLists([...lists, listName]);
          }
        })
        .catch(e => {
          console.error("An error occured while creating a lists: ", e);
        })
        .finally(() => setLoading(false));
    }
    else {
      console.warn("Couldn't add list as apiGatewayUrl is not defined yet");
    }
  }

  return {
    lists,
    addList,
    loading: loading || apiGatewayUrl === "",
  }
}

export function useList(listName: string) {
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { apiGatewayUrl } = useConfig();

  useEffect(() => {
    if(apiGatewayUrl !== "") {
      setLoading(true);
      fetch(`${apiGatewayUrl}get?type=list&name=${listName}`)
        .then(data => data.json())
        .then((data: ListObject) => setList(data.items))
        .catch(e => {
          console.error("An error occured while fetching lists: ", e);
        })
        .finally(() => setLoading(false));
    }
  }, [ listName, apiGatewayUrl ])

  function addItem(item: string) {
    if(apiGatewayUrl !== "") {
      setLoading(true);
      fetch(`${apiGatewayUrl}create`, {
        method: "POST",
        body: JSON.stringify({
          type: "item",
          listName: listName,
          item,
        }),
      })
        .then(data => data.json())
        .then(data => {
          if(data.success) {
            setList([...list, item]);
          }
        })
        .catch(e => {
          console.error("An error occured while adding an item to the list: ", e);
        })
        .finally(() => setLoading(false));
    }
  }

  function removeItem(item: string) {
    if(apiGatewayUrl !== "") {
      setLoading(true);
      fetch(`${apiGatewayUrl}delete`, {
        method: "DELETE",
        body: JSON.stringify({
          type: "item",
          listName: listName,
          item,
        }),
      })
        .then(data => data.json())
        .then((data: ListObject) => setList(data.items))
        .catch(e => {
          console.error("An error occured while removing an item from the list: ", e);
        })
        .finally(() => setLoading(false));
    }
  }

  return {
    list,
    addItem,
    removeItem,
    loading: loading ||apiGatewayUrl === "",
  }
}