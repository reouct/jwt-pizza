import React from "react";
import View from "./view";
import { pizzaService } from "../service/service";
import { User, UserList, Role } from "../service/pizzaService";
import Button from "../components/button";

export default function ListUsers() {
  const [page, setPage] = React.useState(0);
  const [users, setUsers] = React.useState<User[]>([]);
  const [more, setMore] = React.useState(false);

  React.useEffect(() => {
    // Try to fetch from the backend. If backend isn't available, fall back to empty list.
    (async () => {
      try {
        const r: UserList = await pizzaService.getUsers(page, 10);
        console.log(
          `Page ${page}: received ${r.users?.length || 0} users, more: ${
            r.more
          }`
        );
        setUsers(r.users || []);
        setMore(!!r.more);
      } catch (e) {
        // Backend not available yet — render empty placeholder UI.
        console.log(`Page ${page}: API error`, e);
        setUsers([]);
        setMore(false);
      }
    })();
  }, [page]);

  return (
    <View title="Users">
      <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
        <h3 className="text-neutral-100 text-xl mb-4">Users</h3>
        <div className="bg-neutral-100 overflow-clip my-4">
          <div className="px-4 py-2 text-sm text-neutral-300">
            Page {page + 1}
          </div>
          <div className="flex flex-col">
            <div className="-m-1.5 overflow-x-auto">
              <div className="p-1.5 min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                      <tr>
                        {["ID", "Name", "Email", "Role"].map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="px-6 py-3 text-center text-xs font-medium"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-10 text-center text-sm text-gray-600"
                          >
                            No users to display.
                          </td>
                        </tr>
                      ) : (
                        users.map((u, idx) => (
                          <tr key={idx} className="hover:bg-gray-100">
                            <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm text-gray-800">
                              {u.id || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm text-gray-800">
                              {u.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm text-gray-800">
                              {u.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm text-gray-800">
                              {u.roles?.map((r) => r.role).join(", ")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="text-end py-2">
                          <Button
                            title="«"
                            className="w-12"
                            onPress={() => setPage(Math.max(0, page - 1))}
                            disabled={page <= 0}
                          />
                          <Button
                            title="»"
                            className="w-12"
                            onPress={() =>
                              page < 0 ? setPage(0) : setPage(page + 1)
                            }
                            disabled={!more}
                          />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </View>
  );
}
