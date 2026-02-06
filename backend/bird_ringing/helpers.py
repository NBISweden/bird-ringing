from pathlib import Path
import os


def get_secret_from_file(env_var_name: str, default: str = None) -> str:
    """
    Reads a secret from a file path defined in an environment variable.

    :param env_var_name: Name of the environment variable pointing to the file
    :param default: Optional default if variable is unset or file is unreadable
    :return: The file contents (stripped), or default
    """
    path = os.getenv(env_var_name)
    if path:
        try:
            return Path(path).read_text().strip()
        except FileNotFoundError:
            pass
    return default


def strtobool(val: str):
    """Convert a string representation of truth to boolean.

    True values are case insensitive 'true'.
    false values are case insensitive 'false'.
    Raises ValueError if 'val' is anything else.
    """

    if type(val) is bool:
        return val

    val = val.lower()
    if val == "true":
        return True
    elif val == "false":
        return False
    else:
        raise ValueError("invalid truth value %r" % (val,))


def parse_csv_from_env(env_var_name: str, default: list[str]):
    """
    Reads an environment variable and parses it as a CSV string

    :param env_var_name: Name of environment variable containing CSV
    :param default: The value returned if the envornment variable is unset
    :return: A list of (stripped) strings
    """
    csv_str = os.getenv(env_var_name)
    if csv_str:
        strOrEmpty = [v.strip() for v in csv_str.split(",")]
        return [v for v in strOrEmpty if v != ""]
    return default