import unittest
import threading
import requests
import queue


class TestConcurrentCreateRequests(unittest.TestCase):
    def setUp(self):
        """
        Setup is called before test execution
        """
        self.threads = []
        self.root = "http://localhost:3210/api"
        self.username = "user"
        self.password = "test"

    def tearDown(self):
        """
        TearDown is called after test execution
        """
        for t in self.threads:
            t.join()  # Wait for each thread to finish

    def threaded_request(self, queue, url: str, data=None):
        response = requests.put(
            url,
            data=data,
            auth=(self.username, self.password)
        )
        
        queue.put((response.status_code, response.json()))

    def test_create_licenses_in_parallel(self):
        mnrs=[
            "0000",
            "0001",
            "0002",
            "0003",
            "0004",
            "0005",
            "0006",
            "0007",
            "0008",
            "0009",
            "0010",
        ]
        entries = [
            (self._get_license_action_url("card-create", mnrs), None)
            for i in range(5)
        ]

        result_list = self._parallell_requests(entries)
        self.assertTrue(len(result_list) > 0)

        status_code, data = result_list[0]
        self.assertEqual(status_code, 200)
        for status_code_a, data_a in result_list[1:]:
            self.assertEqual(status_code_a, status_code)
            self.assertEqual(data_a, data)
    
    def test_create_permits_in_parallel(self):
        mnrs=[
            "0000",
            "0001",
            "0002",
            "0003",
            "0004",
            "0005",
            "0006",
            "0007",
            "0008",
            "0009",
            "0010",
        ]
        entries = [
            (self._get_license_action_url("permit-create", mnrs), None)
            for i in range(5)
        ]

        result_list = self._parallell_requests(entries)
        self.assertTrue(len(result_list) > 0)

        status_code, data = result_list[0]
        self.assertEqual(status_code, 200)
        for status_code_a, data_a in result_list[1:]:
            self.assertEqual(status_code_a, status_code)
            self.assertEqual(data_a, data)

    def _parallell_requests(self, entries: list[tuple[str, dict | None]]):
        result_queue: queue.Queue = queue.Queue()
        for (url, data) in entries:
            t = threading.Thread(target=self.threaded_request, args=(result_queue, url, data))
            self.threads.append(t)
            t.start()

        for t in self.threads:
            t.join()
        
        return list(result_queue.queue)


    def _get_license_action_url(self, action: str, mnrs: list[str]):
        mnrs_arg = ",".join(mnrs)
        return f"{self.root}/license_sequence/{action}/?mnrs={mnrs_arg}"


if __name__ == "__main__":
    unittest.main()